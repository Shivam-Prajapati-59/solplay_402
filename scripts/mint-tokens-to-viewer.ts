import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, mintTo } from "@solana/spl-token";

async function main() {
  // Connect to local validator
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const tokenMint = new PublicKey("J634xHvwT145KAKMMTPVKjYbgU5YpvX4ZYSkW9QFYu2K");
  const viewer = new PublicKey("AyjzqxrgkjeY2jMx8xJGNyG6LbJQfhSNbvuwKNZ2eXQz");
  
  console.log("🪙 Minting tokens to viewer...");
  console.log("  Token Mint:", tokenMint.toString());
  console.log("  Viewer:", viewer.toString());
  
  // Get viewer's token account
  const viewerTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    viewer
  );
  console.log("  Viewer Token Account:", viewerTokenAccount.toString());
  
  // Mint 1000 tokens (1000 * 10^6 because 6 decimals)
  const amount = 1000 * 1_000_000;
  console.log(`  Minting ${amount / 1_000_000} tokens...`);
  
  const signature = await mintTo(
    provider.connection,
    (provider.wallet as any).payer,
    tokenMint,
    viewerTokenAccount,
    provider.wallet.publicKey,
    amount
  );
  
  console.log("✅ Tokens minted!");
  console.log("  Signature:", signature);
  console.log(`  Viewer now has 1000 tokens`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
