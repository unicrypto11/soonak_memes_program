import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SoonakMemesProgram } from "../target/types/soonak_memes_program";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createMint,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token'

describe("soonak_memes_program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.local();
  const program = anchor.workspace.SoonakMemesProgram as Program<SoonakMemesProgram>;

  const person1 = anchor.web3.Keypair.generate();
  const person2 = anchor.web3.Keypair.generate();
  const payer = anchor.web3.Keypair.generate();
  // const payer = provider.wallet.payer;
  const mintAuthSC = anchor.web3.Keypair.generate();
  const mintKeypairSC = anchor.web3.Keypair.generate();
  let mintSC: anchor.web3.PublicKey;
  let person1ATA;

  before(async()=> {
    await provider.connection.confirmTransaction(await provider.connection.requestAirdrop(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL));
    await provider.connection.confirmTransaction(await provider.connection.requestAirdrop(person1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL), "confirmed");
    await provider.connection.confirmTransaction(await provider.connection.requestAirdrop(person2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL), "confirmed");
    console.log("payer", payer);
    mintSC = await createMint(provider.connection, payer, mintAuthSC.publicKey, mintAuthSC.publicKey, 9, mintKeypairSC);
    console.log("Mint:", mintSC);
    person1ATA = await getOrCreateAssociatedTokenAccount(provider.connection, payer, mintSC, person1.publicKey);
    console.log("ATA:", person1ATA.address.toString());
    const tx = await mintTo(provider.connection, payer, mintSC, person1ATA.address, mintAuthSC, 10 * anchor.web3.LAMPORTS_PER_SOL);
    console.log("TX", tx);
    const balance = await provider.connection.getTokenAccountBalance(person1ATA.address);
    console.log("balance:", balance);
  });

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

  it("donate to comp with sol", async () => {
    // Add your test here.
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("comp"), new anchor.web3.PublicKey("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf").toBuffer()], program.programId);
    const [prizePoolPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("prize_pool"), new anchor.web3.PublicKey("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf").toBuffer()], program.programId);
    const tx = await program.methods.createComp().accounts({ tokenAddress: "GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf" }).rpc();
    const comp = await program.account.comp.fetch(compPda);
    const prize_pool = await program.account.prizePool.fetch(prizePoolPda);
    console.log("prize_pool:", prize_pool.totalAmount.toString());
    console.log("comp create time:", new Date(comp.createTime.toNumber() * 1000).toUTCString());
    console.log("Your transaction signature", tx);
    const preBalance = await provider.connection.getBalance(prizePoolPda);
    console.log("pre balance:", preBalance);
    const donateTx = await program.methods.donate2CompSol(new anchor.BN(100_000_000)).accounts({comp: compPda, prizePool: prizePoolPda, user: provider.wallet.publicKey, to: prizePoolPda}).rpc();
    console.log("Your transaction signature", donateTx);
    const balance = await provider.connection.getBalance(prizePoolPda);
    console.log("balance:", balance);
  });

  it("donate to comp with token", async () => {
    // Add your test here.
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("comp"), new anchor.web3.PublicKey("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf").toBuffer()], program.programId);
    const [prizePoolPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("prize_pool"), new anchor.web3.PublicKey("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf").toBuffer()], program.programId);
    const tx = await program.methods.createComp().accounts({ tokenAddress: "GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf" }).rpc();
    const comp = await program.account.comp.fetch(compPda);
    const prize_pool = await program.account.prizePool.fetch(prizePoolPda);
    console.log("prize_pool:", prize_pool.totalAmount.toString());
    console.log("comp create time:", new Date(comp.createTime.toNumber() * 1000).toUTCString());
    console.log("Your transaction signature", tx);
    const preBalance = await provider.connection.getBalance(prizePoolPda);
    console.log("pre balance:", preBalance);
    const donateTx = await program.methods.donate2CompSol(new anchor.BN(100_000_000)).accounts({comp: compPda, prizePool: prizePoolPda, user: provider.wallet.publicKey, to: prizePoolPda}).rpc();
    console.log("Your transaction signature", donateTx);
    const balance = await provider.connection.getBalance(prizePoolPda);
    console.log("balance:", balance);
    const prizePoolATA = await getOrCreateAssociatedTokenAccount(provider.connection, payer, mintSC, prizePoolPda, true);
    const preTokenBalance = await provider.connection.getTokenAccountBalance(prizePoolATA.address);
    console.log("pre token balance:", preTokenBalance);
    const donateTokenTx = await program.methods.donate2CompToken(new anchor.BN(100_000_000)).accounts({comp: compPda, prizePool: prizePoolPda, user: person1.publicKey, fromTokenAccount: person1ATA.address, toTokenAccount: prizePoolATA.address}).signers([person1]).rpc();
    console.log("Your transaction signature", donateTokenTx);
    const tokenBalance = await provider.connection.getTokenAccountBalance(prizePoolATA.address);
    console.log("token balance:", tokenBalance);
  });

  it("submit meme to comp", async () => {
    
  });
  
});
