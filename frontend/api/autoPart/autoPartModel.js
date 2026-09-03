import mongoose from "mongoose";

const autoPartSchema = new mongoose.Schema(
  {
    partName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    partNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    brandName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["engine", "brake", "suspension", "electrical", "body", "interior", "other"],
      default: "other",
    },
    image: {
      url: {
        type: String,
        required: true,
      },
      ipfsHash: {
        type: String,
        required: true,
      },
    },
    thumbnail: {
      type: String,
    },
    price: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },
    specs: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    tokenURI: {
      type: String,
    },
    metadataHash: {
      type: String,
    },
    metadataCid: {
      type: String,
    },
    tokenId: {
      type: Number,
      sparse: true,
      index: true,
    },
    contractAddress: {
      type: String,
      required: true,
    },
    trackingNumber: {
      type: String,
      sparse: true,
    },
    createdBy: {
      address: {
        type: String,
        lowercase: true,
        index: true,
      },
      role: {
        type: String,
        enum: ["manufacturer", "admin"],
        default: "manufacturer",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

autoPartSchema.index({ partName: "text", partNumber: "text", brandName: "text" });

autoPartSchema.pre("save", async function (next) {
  if (!this.tokenURI && !this.metadataHash) {
    try {
      const metadata = {
        name: this.partName,
        partNumber: this.partNumber,
        brandName: this.brandName,
        description: this.description || "",
        category: this.category || "other",
        image: this.image.url,
        createdBy: this.createdBy?.address || "",
        createdAt: new Date().toISOString(),
      };

      const pinataUtils = await import("../config/pinata.js");
      const cid = await pinataUtils.default.uploadJSON(metadata);
      this.metadataCid = cid;
      this.tokenURI = `ipfs://${cid}`;

      const { ethers } = await import("ethers");
      this.metadataHash = ethers.keccak256(
        ethers.toUtf8String(JSON.stringify(metadata))
      );

      this.thumbnail = this.image.url;

    } catch (error) {
      console.error("Metadata generation failed:", error);
      return next(error);
    }
  }
  next();
});

autoPartSchema.virtual("isInStock").get(function () {
  return this.quantity > 0;
});

autoPartSchema.statics.findByTokenId = function (tokenId) {
  return this.findOne({ tokenId });
};

const AutoPart = mongoose.model("AutoPart", autoPartSchema);

export default AutoPart;