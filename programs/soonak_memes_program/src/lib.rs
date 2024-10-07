use anchor_lang::prelude::*;

declare_id!("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf");

#[program]
pub mod soonak_memes_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
