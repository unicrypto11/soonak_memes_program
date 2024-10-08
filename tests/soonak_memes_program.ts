import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SoonakMemesProgram } from "../target/types/soonak_memes_program";

describe("soonak_memes_program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SoonakMemesProgram as Program<SoonakMemesProgram>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("Is Comp Created!", async () => {
    // Add your test here.
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("comp"), new anchor.web3.PublicKey("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf").toBuffer()], program.programId);
    const [prizePoolPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("prize_pool"), new anchor.web3.PublicKey("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf").toBuffer()], program.programId);
    const tx = await program.methods.createComp().accounts({ tokenAddress: "GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf" }).rpc();
    const comp = await program.account.comp.fetch(compPda);
    const prize_pool = await program.account.prizePool.fetch(prizePoolPda);
    console.log("prize_pool:", prize_pool.totalAmount.toString());
    console.log("comp create time:", new Date(comp.createTime.toNumber() * 1000).toUTCString());
    console.log("Your transaction signature", tx);
  });
});
