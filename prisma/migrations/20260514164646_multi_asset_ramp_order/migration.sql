-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "assetIssuer" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "etherfuseCustomerId" TEXT;

-- CreateTable
CREATE TABLE "RampOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "etherfuseOrderId" TEXT,
    "etherfuseQuoteId" TEXT,
    "fiatAmount" TEXT NOT NULL,
    "fiatCurrency" TEXT NOT NULL DEFAULT 'BRL',
    "cryptoAmount" TEXT,
    "cryptoAssetCode" TEXT NOT NULL,
    "cryptoAssetIssuer" TEXT NOT NULL,
    "walletPublicKey" TEXT NOT NULL,
    "pixKey" TEXT,
    "pixQrCode" TEXT,
    "pixExpiration" DATETIME,
    "memo" TEXT,
    "destinationAddress" TEXT,
    "bankAccountId" TEXT,
    "stellarHash" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RampOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RampOrder_etherfuseOrderId_key" ON "RampOrder"("etherfuseOrderId");
