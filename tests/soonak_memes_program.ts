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
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("comp")], program.programId);
    const tx = await program.methods.createComp().rpc();
    const comp = await program.account.comp.fetch(compPda);
    console.log("comp", comp);
    console.log("Your transaction signature", tx);
  });
});
