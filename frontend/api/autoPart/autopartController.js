import AutoPart from "./autoPartModel.js";
import { ethers } from "ethers";
import contractArtifact from "../contractABI/AutoPartNFT_Pro_.json" with { type: "json" };
import { config } from "../config/config.js";

const getContract = async () => {
  try {
    const provider = new ethers.JsonRpcProvider(config.rpc_url);
    const wallet = new ethers.Wallet(config.privatekey, provider);
    return new ethers.Contract(config.contractAddress, ABI.abi, wallet);
  } catch (error) {
    console.log("error getting contract:", error);
  }
};

export const createautoPart = async (req, res, next) => {
  try {
    const autoPart = await AutoPart.create({
      ...req.body,
      contractAddress: config.contractAddress,
      createdBy: {
        address: req.walletAddress,
        role: "manufacturer",
      },
    });
    res.status(201).json({
      status: "success",
      data: { autoPart },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getAllAutoParts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, brandName, search } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (brandName) query.brandName = brandName;

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const [autoParts, total] = await Promise.all([
      AutoPart.find(query)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      AutoPart.countDocuments(query),
    ]);

    res.status(200).json({
      status: "success",
      data: { autoParts },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "success",
      message: error.message,
    });
  }
};

export const getAutoPart = async (req, res, next) => {
  try {
    const autoPart = await AutoPart.findById(req.params.id);
    if (!autoPart) {
      return res.status(404).json({
        status: "error",
        message: "Part not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: { autoPart },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: "error.message",
    });
  }
};

export const getAutoPartByTokenId = async (req, res) => {
  try {
    const autoPart = await AutoPart.findOne({ tokenId: req.params.tokenId });

    if (!autoPart) {
      return res.status(404).json({
        status: "error",
        message: "part not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { autoPart },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const updateAutoPart = async (req, res) => {
  try {
    const autoPart = await AutoPart.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!autoPart) {
      return res.status(404).json({
        status: "error",
        message: "Part not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: { autoPart },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const deleteAutoPart = async (req, res) => {
  try {
    const autoPart = await AutoPart.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );

    if (!autoPart) {
      return res.status(404).json({
        status: "error",
        message: "Part not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const mintAutoPart = async (req, res) => {
  try {
    const { partId, retailerAddress } = req.body;

    const part = await AutoPart.findById(partId);

    if (!part) {
      return res.status(404).json({
        status: "error",
        message: "Part not found",
      });
    }

    if (part.tokenId) {
      return res.status(400).json({
        status: "error",
        message: "Part already minted",
      });
    }

    const contract = await getContract();

    const tx = await contract.mintPartToRetailer(
      retailerAddress,
      part.tokenURI,
      part.metadataHash,
    );

    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log) => contract.interface.parseLog(log))
      .find((parsed) => parsed && parsed.name === "PartMinted");

    if (event) {
      part.tokenId = Number(event.args.tokenId);
      await part.save();
    }

    res.status(200).json({
      status: "success",
      data: {
        part,
        transactionHash: receipt.hash,
        tokenId: part.tokenId,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const syncPartWithBlockchain = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const part = await AutoPart.findOne({ tokenId });
    if (!part) {
      return res.status(404).json({
        status: "error",
        message: "Part not found",
      });
    }

    const contract = await getContract();

    const custodian = await contract.getNFTCustodian(tokenId);

    const partDetails = await contract.parts(tokenId);

    const saleStatus = await contract.getSaleStatus(tokenId);

    const owner = await contract.ownerOf(tokenId);

    res.status(200).json({
      status: "success",
      data: {
        custodian,
        status: Object.keys(partDetails.status)[0],
        saleStatus: Object.keys(saleStatus)[0],
        owner,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};
