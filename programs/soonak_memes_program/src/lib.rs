use anchor_lang::prelude::*;
use anchor_spl::token::TokenProgram;

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
}



#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct CreateComp<'info> {
    #[account(init_if_needed, payer = user, space = 8 + 8 + 8 + 8,  seeds = [b"comp", token_address], bump)]
    pub comp: Account<'info, Comp>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,

    // #[account(init_if_needed, payer = user, space = 8 + 8 + 8 + 8,  seeds = [b"prize_pool"], bump)]
    // pub prize_pool: Account<'info, PrizePool>,
    pub token_address: Account<'info, TokenProgram>,
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
