const {ethers} = require("hardhat");

async function main() {
    const Contract = await ethers.getContractFactory("AutoPartNFT_Pro");

    console.log("Deployment Bytecode:");
    console.log(Contract.bytecode);

    console.log("\nBytecode Length (bytes):");
    console.log((Contract.bytecode.length - 2) / 2);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});