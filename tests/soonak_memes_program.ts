import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SoonakMemesProgram } from "../target/types/soonak_memes_program";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createMint,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import { assert, expect } from 'chai'



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

  before(async () => {
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

    // Create another competition with a different token address
    const [compPda2] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("comp"), mintSC.toBuffer()],
      program.programId
    );
    const [prizePoolPda2] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("prize_pool"), mintSC.toBuffer()],
      program.programId
    );

    const tx2 = await program.methods.createComp()
      .accounts({
        comp: compPda2,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        prizePool: prizePoolPda2,
        tokenAddress: mintSC
      })
      .rpc();

    const comp2 = await program.account.comp.fetch(compPda2);
    const prizePool2 = await program.account.prizePool.fetch(prizePoolPda2);
    console.log("Second competition created with token:", mintSC.toString());

    console.log("prize_pool:", prize_pool.totalAmount.toString());
    console.log("comp create time:", new Date(comp.createTime.toNumber() * 1000).toUTCString());
    console.log("Your transaction signature", tx);
  });

  it("Get created comps!", async () => {
    // Fetch all accounts of type Comp
    const allComps = await program.account.comp.all();

    console.log("Found", allComps.length, "competitions");

    // Log details for each competition
    allComps.forEach((comp, index) => {
      console.log(`\nCompetition ${index + 1}:`);
      console.log("PDA:", comp.publicKey.toString());
      console.log("Create time:", new Date(comp.account.createTime.toNumber() * 1000).toUTCString());
      console.log("Start time:", new Date(comp.account.startTime.toNumber() * 1000).toUTCString());
      console.log("End time:", new Date(comp.account.endTime.toNumber() * 1000).toUTCString());
      console.log("Number of memes:", comp.account.memes.length);

      // Log details of each meme in the competition
      comp.account.memes.forEach((meme, memeIndex) => {
        console.log(`\n  Meme ${memeIndex + 1}:`);
        console.log("  Name:", meme.name);
        console.log("  URL:", meme.url);
        console.log("  Votes:", meme.votes.toString());
        console.log("  Submitter:", meme.submitter.toString());
      });
    });
  });

  it("donate to comp with sol", async () => {
    // Add your test here.
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("comp"), new anchor.web3.PublicKey("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf").toBuffer()], program.programId);
    const [prizePoolPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("prize_pool"), new anchor.web3.PublicKey("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf").toBuffer()], program.programId);
    // const tx = await program.methods.createComp().accounts({ tokenAddress: "GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf" }).rpc();
    const comp = await program.account.comp.fetch(compPda);
    const prize_pool = await program.account.prizePool.fetch(prizePoolPda);
    console.log("prize_pool:", prize_pool.totalAmount.toString());
    console.log("comp create time:", new Date(comp.createTime.toNumber() * 1000).toUTCString());
    // console.log("Your transaction signature", tx);
    const preBalance = await provider.connection.getBalance(prizePoolPda);
    console.log("pre balance:", preBalance);
    const donateTx = await program.methods.donate2CompSol(new anchor.BN(100_000_000)).accounts({ comp: compPda, prizePool: prizePoolPda, user: provider.wallet.publicKey, to: prizePoolPda }).rpc();
    console.log("Your transaction signature", donateTx);
    const balance = await provider.connection.getBalance(prizePoolPda);
    console.log("balance:", balance);
  });

  it("donate to comp with token", async () => {
    // Add your test here.
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("comp"), mintSC.toBuffer()], program.programId);
    const [prizePoolPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("prize_pool"), new anchor.web3.PublicKey("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf").toBuffer()], program.programId);
    // const tx = await program.methods.createComp().accounts({ tokenAddress: "GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf" }).rpc();
    const comp = await program.account.comp.fetch(compPda);
    const prize_pool = await program.account.prizePool.fetch(prizePoolPda);
    console.log("prize_pool:", prize_pool.totalAmount.toString());
    console.log("comp create time:", new Date(comp.createTime.toNumber() * 1000).toUTCString());
    // console.log("Your transaction signature", tx);
    const preBalance = await provider.connection.getBalance(prizePoolPda);
    console.log("pre balance:", preBalance);

    const balance = await provider.connection.getBalance(prizePoolPda);
    console.log("balance:", balance);
    const prizePoolATA = await getOrCreateAssociatedTokenAccount(provider.connection, payer, mintSC, prizePoolPda, true);
    const preTokenBalance = await provider.connection.getTokenAccountBalance(prizePoolATA.address);
    console.log("pre token balance:", preTokenBalance);
    const donateTokenTx = await program.methods.donate2CompToken(new anchor.BN(100_000_000)).accounts({ comp: compPda, prizePool: prizePoolPda, user: person1.publicKey, fromTokenAccount: person1ATA.address, toTokenAccount: prizePoolATA.address }).signers([person1]).rpc();
    console.log("Your transaction signature", donateTokenTx);
    const tokenBalance = await provider.connection.getTokenAccountBalance(prizePoolATA.address);
    console.log("token balance:", tokenBalance);
  });

  it("submit meme to comp", async () => {
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("comp"), new anchor.web3.PublicKey("GqPZ3xwsZqbuq76VwFv6i4N2QKuU4bdFYRrgMrehwmJf").toBuffer()], program.programId);
    const comp = await program.account.comp.fetch(compPda);
    console.log("comp create time:", new Date(comp.createTime.toNumber() * 1000).toUTCString());
    const tx = await program.methods.submitMeme("Hello", "Test").accounts({ comp: compPda }).rpc();
    console.log("Your transaction signature", tx);
    const memeData = await program.account.comp.fetch(compPda);
    for (const meme of memeData.memes) {
      console.log("meme:", meme);
    }
  });


  // ... existing imports and setup ...
  it("Can vote for a meme in active competition", async () => {
    // First create a competition
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("comp"), mintSC.toBuffer()],
      program.programId
    );
    const [prizePoolPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("prize_pool"), mintSC.toBuffer()],
      program.programId
    );

    // Create competition
    await program.methods.createComp()
      .accounts({
        comp: compPda,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        prizePool: prizePoolPda,
        tokenAddress: mintSC
      })
      .rpc();

    // Start competition
    await program.methods.startComp()
      .accounts({
        comp: compPda,
        user: provider.wallet.publicKey,
        prizePool: prizePoolPda
      })
      .rpc();

    // Submit a meme
    const memeName = "Test Meme";
    const memeUrl = "https://example.com/meme.jpg";

    await program.methods.submitMeme(memeName, memeUrl)
      .accounts({
        comp: compPda,
        user: provider.wallet.publicKey,
      })
      .rpc();

    // Vote for the meme
    await program.methods.voteMeme(new anchor.BN(0))
      .accounts({
        comp: compPda,
        user: person1.publicKey,
        voterTokenAccount: person1ATA.address,
      })
      .signers([person1])
      .rpc();

    // Fetch competition state and verify vote count
    const compState = await program.account.comp.fetch(compPda);
    console.log("CompState: ", compState);

    // Get token balance
    const tokenBalance = await provider.connection.getTokenAccountBalance(person1ATA.address);

    // Calculate expected vote weight (1 vote per million tokens, minimum 1)
    const tokenAmount = Number(tokenBalance.value.amount);
    const expectedVoteWeight = Math.max(1, Math.floor(tokenAmount / 1_000_000));

    assert.equal(compState.memes[0].votes.toNumber(), expectedVoteWeight);
    assert.equal(compState.memes[0].name, memeName);
    assert.equal(compState.memes[0].url, memeUrl);
  });

  it("Cannot vote twice in same snapshot period", async () => {
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("comp"), mintSC.toBuffer()],
      program.programId
    );

    // Try to vote again immediately

    try {
      await program.methods.voteMeme(new anchor.BN(0))
        .accounts({
          comp: compPda,
          user: person1.publicKey,
          voterTokenAccount: person1ATA.address,
        })
        .signers([person1])
        .rpc();
      assert.fail("Expected second vote to fail");
    } catch (err) {
      assert.equal(err.error.errorMessage, "Already voted in this snapshot period");
    }

  });

  it("Can vote again after snapshot period", async () => {
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("comp"), mintSC.toBuffer()],
      program.programId
    );

    // First vote
    try {
      await program.methods.voteMeme(new anchor.BN(0))
        .accounts({
          comp: compPda,
          user: person1.publicKey,
          voterTokenAccount: person1ATA.address,
        })
        .signers([person1])
        .rpc();
      assert.fail("Expected second vote to fail");
    } catch (err) {
      assert.equal(err.error.errorMessage, "Already voted in this snapshot period");
    }

    // Note: In a real environment, you'd need to wait for an hour
    // For testing, you might want to add a way to manipulate the snapshot time
    // This test is more of a placeholder to show the structure
  });

  it("Can complete competition and distribute prizes correctly", async () => {
    // Create competition
    const [compPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("comp"), mintSC.toBuffer()],
      program.programId
    );
    const [prizePoolPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("prize_pool"), mintSC.toBuffer()],
      program.programId
    );

    // Create competition
    await program.methods.createComp()
      .accounts({
        comp: compPda,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        prizePool: prizePoolPda,
        tokenAddress: mintSC
      })
      .rpc();

    // Start competition
    await program.methods.startComp()
      .accounts({
        comp: compPda,
        user: provider.wallet.publicKey,
        prizePool: prizePoolPda
      })
      .rpc();

    // Create ATAs for winners and DAO
    const daoKeypair = anchor.web3.Keypair.generate();
    const winner1Keypair = anchor.web3.Keypair.generate();
    const winner2Keypair = anchor.web3.Keypair.generate();

    // Airdrop SOL to winners for account creation
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(daoKeypair.publicKey, anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(winner1Keypair.publicKey, anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(winner2Keypair.publicKey, anchor.web3.LAMPORTS_PER_SOL)
    );

    const daoATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mintSC,
      daoKeypair.publicKey
    );
    const winner1ATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mintSC,
      winner1Keypair.publicKey
    );
    const winner2ATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mintSC,
      winner2Keypair.publicKey
    );

    // Submit memes from different users
    await program.methods.submitMeme("Winner 1", "https://example.com/meme1.jpg")
      .accounts({
        comp: compPda,
        user: winner1Keypair.publicKey,
      })
      .signers([winner1Keypair])
      .rpc();

    await program.methods.submitMeme("Winner 2", "https://example.com/meme2.jpg")
      .accounts({
        comp: compPda,
        user: winner2Keypair.publicKey,
      })
      .signers([winner2Keypair])
      .rpc();

    // Add some votes
    await program.methods.voteMeme(new anchor.BN(0))
      .accounts({
        comp: compPda,
        user: person1.publicKey,
        voterTokenAccount: person1ATA.address,
      })
      .signers([person1])
      .rpc();

    // Get prize pool ATA
    const prizePoolATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mintSC,
      prizePoolPda,
      true
    );

    // Add funds to prize pool
    await program.methods.donate2CompToken(new anchor.BN(1_000_000_000))
      .accounts({
        comp: compPda,
        prizePool: prizePoolPda,
        user: person1.publicKey,
        fromTokenAccount: person1ATA.address,
        toTokenAccount: prizePoolATA.address,
      })
      .signers([person1])
      .rpc();

    // Record initial balances
    const initialPrizePoolBalance = await provider.connection.getTokenAccountBalance(prizePoolATA.address);
    const initialDaoBalance = await provider.connection.getTokenAccountBalance(daoATA.address);
    const initialWinner1Balance = await provider.connection.getTokenAccountBalance(winner1ATA.address);
    const initialWinner2Balance = await provider.connection.getTokenAccountBalance(winner2ATA.address);

    // Finish competition
    // In your test file, modify the finish_comp call:
    await program.methods.finishComp()
      .accounts({
        comp: compPda,
        prizePool: prizePoolPda,
        prizeTokenAccount: prizePoolATA.address,
        daoTokenAccount: daoATA.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenAddress: mintSC,
      })
      .remainingAccounts([
        {
          pubkey: winner1ATA.address,
          isWritable: true,
          isSigner: false
        },
        {
          pubkey: winner2ATA.address,
          isWritable: true,
          isSigner: false
        }
      ])
      .rpc();

    // Get final balances
    const finalPrizePoolBalance = await provider.connection.getTokenAccountBalance(prizePoolATA.address);
    const finalDaoBalance = await provider.connection.getTokenAccountBalance(daoATA.address);
    const finalWinner1Balance = await provider.connection.getTokenAccountBalance(winner1ATA.address);
    const finalWinner2Balance = await provider.connection.getTokenAccountBalance(winner2ATA.address);

    // Verify prize distribution
    const totalPrize = Number(initialPrizePoolBalance.value.amount);
    const daoShare = Math.floor(totalPrize * 0.1); // 10% for DAO
    const winnersShare = Math.floor((totalPrize - daoShare) / 2); // Split remaining among winners

    assert.equal(
      Number(finalDaoBalance.value.amount) - Number(initialDaoBalance.value.amount),
      daoShare,
      "Incorrect DAO share"
    );
    assert.equal(
      Number(finalWinner1Balance.value.amount) - Number(initialWinner1Balance.value.amount),
      winnersShare,
      "Incorrect Winner 1 share"
    );
    assert.equal(
      Number(finalWinner2Balance.value.amount) - Number(initialWinner2Balance.value.amount),
      winnersShare,
      "Incorrect Winner 2 share"
    );

    // Verify competition is marked as finished
    const finalCompState = await program.account.comp.fetch(compPda);
    assert.isTrue(finalCompState.isFinished, "Competition should be marked as finished");
  });


});
