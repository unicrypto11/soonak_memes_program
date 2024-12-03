use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token};

declare_id!("33zHE6FfLcuaey1eTv6d1zrwuy7EdwnhURyDXuytT13F");

#[program]
pub mod soonak_memes_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn create_comp(ctx: Context<CreateComp>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let comp = &mut ctx.accounts.comp;
        let now = Clock::get()?.unix_timestamp;
        comp.create_time = now;
        comp.donation_end_time = now + 30 * 24 * 60 * 60; // 30 days donation period
        comp.start_time = 0;
        comp.end_time = 0;
        comp.last_snapshot_time = 0;
        comp.is_finished = false;
        Ok(())
    }

    pub fn start_comp(ctx: Context<StartComp>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let comp = &mut ctx.accounts.comp;
        let now = Clock::get()?.unix_timestamp;
        
        // Check if donation period is still active
        require!(now <= comp.donation_end_time, CustomError::DonationPeriodEnded);
        
        comp.start_time = now;
        comp.end_time = now + 30 * 24 * 60 * 60; // competition will go on for 30 days
        Ok(())
    }

    pub fn finish_comp<'info>(ctx: Context<'_, '_ , 'info ,'info,FinishComp<'info>>) -> Result<()> {
        let comp = &mut ctx.accounts.comp;
        let prize_pool = &mut ctx.accounts.prize_pool;
        let now = Clock::get()?.unix_timestamp;
    
        // Check if competition period has ended
        require!(now > comp.end_time, CustomError::CompetitionNotEnded);
        require!(!comp.is_finished, CustomError::CompetitionAlreadyFinished);
    
        // Sort memes by votes in descending order
        let mut memes = comp.memes.clone();
        memes.sort_by(|a, b| b.votes.cmp(&a.votes));
    
        // Calculate prize distribution
        let total_prize = prize_pool.total_amount;
        let dao_share = (total_prize as f64 * 0.1) as u64; // 10% for DAO
        let winners_share = total_prize - dao_share; // 90% for winners
    
        // Create seeds for PDA signing
        let token_key = ctx.accounts.token_address.key();
        let seeds = &[
            b"prize_pool",
            token_key.as_ref(),
            &[ctx.bumps.prize_pool]
        ];
        let signer = &[&seeds[..]];
    
        // Transfer DAO share
        {
            let prize_token_account_info = ctx.accounts.prize_token_account.to_account_info(); // Store account info in a variable
            let cpi_accounts = anchor_spl::token::Transfer {
                from: prize_token_account_info.clone(),
                to: ctx.accounts.dao_token_account.to_account_info(),
                authority: prize_pool.to_account_info(), // Ensure this is accessed within its scope
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts, signer);
            anchor_spl::token::transfer(cpi_ctx, dao_share)?;
        }
    
        // Distribute prizes to winners using remaining_accounts
        let winner_count = std::cmp::min(5, memes.len());
        let prize_per_winner = winners_share / winner_count as u64;
    
        for i in 0..winner_count {
            let winner_pubkey = memes[i].submitter;
            let winner_account_info = &ctx.remaining_accounts[i]; // Updated to use the new lifetime
    
            // Verify the winner account
            require!(
                winner_account_info.owner == &anchor_spl::token::ID,
                CustomError::InvalidWinnerAccount
            );
    
            // Deserialize and validate winner's token account
            let winner_token_account: Account<'info, TokenAccount> = Account::try_from(&winner_account_info) // Use to_account_info() instead of dereferencing
            .map_err(|_| CustomError::InvalidWinnerAccount)?; // Added semicolon here
        
            require!(
                winner_token_account.owner == winner_pubkey,
                CustomError::InvalidWinnerAccount
            );
    
            // Transfer prize to winner
            {
                let prize_token_account_info = ctx.accounts.prize_token_account.to_account_info(); // Store account info in a variable
                let prize_pool_info = prize_pool.to_account_info(); // Store account info in a variable
                
                // Ensure we are not holding onto mutable references longer than necessary
                let cpi_accounts = anchor_spl::token::Transfer {
                    from: prize_token_account_info.clone(),
                    to: winner_account_info.clone(),
                    authority: prize_pool_info,
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
                anchor_spl::token::transfer(cpi_ctx, prize_per_winner)?;
            }
        }
    
        comp.is_finished = true;
        Ok(())
    }

    pub fn donate_2_comp_sol(ctx: Context<Donate2CompSol>, amount: u64) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let comp = &mut ctx.accounts.comp;
        let now = Clock::get()?.unix_timestamp;
        
        // Check if donation period is still active
        require!(now <= comp.donation_end_time, CustomError::DonationPeriodEnded);
        require!(comp.start_time == 0, CustomError::CompetitionAlreadyStarted);

        let from = &ctx.accounts.user;
        let to = &ctx.accounts.to;

        let cpi_accounts = anchor_lang::system_program::Transfer{
            from: from.to_account_info(),
            to: to.to_account_info(),
        };

        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        anchor_lang::system_program::transfer(cpi_ctx, amount)?;
        
        let prize_pool = &mut ctx.accounts.prize_pool;
        prize_pool.total_amount += amount;

        // If prize pool value exceeds $100, start the competition
        if prize_pool.total_amount >= 100_000_000 { // Assuming 1 SOL = $1 and using lamports
            comp.start_time = now;
            comp.end_time = now + 30 * 24 * 60 * 60;
        }
        
        Ok(())
    }

    pub fn donate_2_comp_token(ctx: Context<Donate2CompToken>, amount: u64) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let comp = &mut ctx.accounts.comp;
        let now = Clock::get()?.unix_timestamp;
        
        // Check if donation period is still active
        require!(now <= comp.donation_end_time, CustomError::DonationPeriodEnded);
        require!(comp.start_time == 0, CustomError::CompetitionAlreadyStarted);

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.from_token_account.to_account_info(),
            to: ctx.accounts.to_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        let prize_pool = &mut ctx.accounts.prize_pool;
        prize_pool.total_amount += amount;

        // If prize pool value exceeds $100, start the competition
        if prize_pool.total_amount >= 100_000_000 { // Assuming 1 token = $1 and using smallest units
            comp.start_time = now;
            comp.end_time = now + 30 * 24 * 60 * 60;
        }

        Ok(())
    }

    pub fn submit_meme(ctx: Context<SubmitMeme>, name: String, url: String) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let comp = &mut ctx.accounts.comp;
        let submitter = &ctx.accounts.user.to_account_info();
        let meme = Meme {
            name,
            url,
            submitter: submitter.key(),
            votes: 0,
        };
        comp.memes.push(meme);
        Ok(())
    }

    pub fn vote_meme(ctx: Context<VoteMeme>, meme_index: u64) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let comp = &mut ctx.accounts.comp;
        let voter = &ctx.accounts.user;
        let token_account = &ctx.accounts.voter_token_account;
        
        // Check if competition is active
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time >= comp.start_time, CustomError::CompetitionNotStarted);
        require!(current_time <= comp.end_time, CustomError::CompetitionEnded);
        
        // Check if meme index is valid
        require!(meme_index < comp.memes.len() as u64, CustomError::InvalidMemeIndex);

        // Take snapshot every hour to prevent manipulation
        if current_time - comp.last_snapshot_time >= 3600 {
            comp.last_snapshot_time = current_time;
            comp.token_snapshot = token_account.amount;
        }

        // Calculate vote weight based on token holdings at snapshot time
        let vote_weight = comp.token_snapshot.checked_div(1_000_000).unwrap_or(1); // 1 vote per million tokens, minimum 1
        
        // Check if user has already voted in this snapshot period
        let voter_key = voter.key();
        require!(!comp.voted_this_snapshot.contains(&voter_key), CustomError::AlreadyVotedThisSnapshot);
        
        // Record the vote
        comp.voted_this_snapshot.push(voter_key);
        
        // Increment vote count for the meme based on weight
        comp.memes[meme_index as usize].votes += vote_weight;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct CreateComp<'info> {
    #[account(init_if_needed, payer = user, space = 8 + 8 + 8 + 8 + 10 * std::mem::size_of::<Meme>() + 8 + 8 + 32 * 100 + 1,  seeds = [b"comp", token_address.key().as_ref()], bump)]
    pub comp: Account<'info, Comp>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,

    #[account(init_if_needed, payer = user, space = 8 + 8 + 8 + 8 + 16,  seeds = [b"prize_pool", token_address.key().as_ref()], bump)]
    pub prize_pool: Account<'info, PrizePool>,
    /// CHECK: safe address. no need to validate.
    pub token_address: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct StartComp<'info> {
    #[account(mut)]
    pub comp: Account<'info, Comp>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub prize_pool: Account<'info, PrizePool>,
}

#[derive(Accounts)]
pub struct FinishComp<'info> {
    #[account(mut)]
    pub comp: Account<'info, Comp>,

    #[account(
        mut,
        seeds = [b"prize_pool", token_address.key().as_ref()],
        bump
    )]
    pub prize_pool: Account<'info, PrizePool>,

    #[account(mut)]
    pub prize_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub dao_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    /// CHECK: safe address. no need to validate.
    pub token_address: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Donate2CompSol<'info> {
    #[account(mut)]
    pub comp: Account<'info, Comp>,

    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: checked account is safe. no need to validate.
    #[account(mut)]
    pub to: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub prize_pool: Account<'info, PrizePool>,
}

#[derive(Accounts)]
pub struct Donate2CompToken<'info> {
    #[account(mut)]
    pub comp: Account<'info, Comp>,

    #[account(mut)]
    pub from_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub prize_pool: Account<'info, PrizePool>,
}

#[derive(Accounts)]
pub struct SubmitMeme<'info> {
    #[account(mut)]
    pub comp: Account<'info, Comp>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct VoteMeme<'info> {
    #[account(mut)]
    pub comp: Account<'info, Comp>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub voter_token_account: Account<'info, TokenAccount>,
}

#[account]
#[derive(Default)]
pub struct Meme {
    pub name: String,
    pub url: String,
    pub votes: u64,
    pub submitter: Pubkey,
}

#[account]
pub struct Comp {
    pub create_time: i64,
    pub donation_end_time: i64,
    pub start_time: i64,
    pub end_time: i64,
    pub memes: Vec<Meme>,
    pub last_snapshot_time: i64,
    pub token_snapshot: u64,
    pub voted_this_snapshot: Vec<Pubkey>,
    pub is_finished: bool,
}

#[account]
pub struct PrizePool{
    pub total_amount: u64,
}

#[error_code]
pub enum CustomError {
    #[msg("Competition has not started yet")]
    CompetitionNotStarted,
    #[msg("Competition has already ended")]
    CompetitionEnded,
    #[msg("Competition has not ended yet")]
    CompetitionNotEnded,
    #[msg("Competition has already been finished")]
    CompetitionAlreadyFinished,
    #[msg("Invalid meme index")]
    InvalidMemeIndex,
    #[msg("Already voted in this snapshot period")]
    AlreadyVotedThisSnapshot,
    #[msg("Donation period has ended")]
    DonationPeriodEnded,
    #[msg("Competition has already started")]
    CompetitionAlreadyStarted,
    #[msg("Invalid winner token account")]
    InvalidWinnerAccount,
}