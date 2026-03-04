-- CreateTable
CREATE TABLE "token_analyses" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'solana',
    "name" TEXT,
    "symbol" TEXT,
    "risk_score" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "flags" TEXT[],
    "top_holder_pct" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "liquidity" DOUBLE PRECISION,
    "volume_24h" DOUBLE PRECISION,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT,
    "outcome_at" TIMESTAMP(3),

    CONSTRAINT "token_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "token_analyses_address_idx" ON "token_analyses"("address");

-- CreateIndex
CREATE INDEX "token_analyses_checked_at_idx" ON "token_analyses"("checked_at");
