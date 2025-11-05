use anchor_lang::prelude::*;

declare_id!("8esALmEtCkKPCkG3GHuSeXUhuwfwrmW3G8vep8GgpHQE");

#[program]
pub mod solplay_402 {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
