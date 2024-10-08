use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token};


declare_id!("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf");

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
        comp.create_time = Clock::get()?.unix_timestamp;
        comp.start_time = 0;
        comp.end_time = 0;
        Ok(())
    }

    pub fn start_comp(ctx: Context<StartComp>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let comp = &mut ctx.accounts.comp;
        comp.start_time = Clock::get()?.unix_timestamp;
        comp.end_time = comp.start_time + 30 * 24 * 60 * 60; // competition will go on for 30 days
        Ok(())
    }

    pub fn donate_2_comp_sol(ctx: Context<Donate2CompSol>, amount: u64) -> Result<()> {

        msg!("Greetings from: {:?}", ctx.program_id);
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
        prize_pool.total_amount += 1;
        Ok(())
    }

    pub fn donate_2_comp_token(ctx: Context<Donate2CompToken>, amount: u64) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.from_token_account.to_account_info(),
            to: ctx.accounts.to_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        anchor_spl::token::transfer(cpi_ctx, amount)?;

        let prize_pool = &mut ctx.accounts.prize_pool;
        prize_pool.total_amount += 1;
        Ok(())
    }
}



#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct CreateComp<'info> {
    #[account(init_if_needed, payer = user, space = 8 + 8 + 8 + 8,  seeds = [b"comp", token_address.key().as_ref()], bump)]
    pub comp: Account<'info, Comp>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,

    #[account(init_if_needed, payer = user, space = 8 + 8,  seeds = [b"prize_pool", token_address.key().as_ref()], bump)]
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


#[account]
pub struct Comp {
    pub create_time: i64,
    pub start_time: i64,
    pub end_time: i64,
}

#[account]
pub struct PrizePool{
    pub total_amount: u64,
}
