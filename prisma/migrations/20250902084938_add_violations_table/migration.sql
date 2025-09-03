-- CreateTable
CREATE TABLE "Violation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "searchId" TEXT,
    "searchResultId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "category" TEXT NOT NULL DEFAULT 'general',
    "imageUrl" TEXT,
    "webPageUrl" TEXT,
    "siteName" TEXT NOT NULL,
    "similarity" REAL,
    "provider" TEXT,
    "thumbnail" TEXT,
    "metadata" JSONB,
    "actionsTaken" JSONB,
    "evidence" JSONB,
    "detectedAt" DATETIME,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Violation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Violation_userId_idx" ON "Violation"("userId");

-- CreateIndex
CREATE INDEX "Violation_status_idx" ON "Violation"("status");

-- CreateIndex
CREATE INDEX "Violation_priority_idx" ON "Violation"("priority");

-- CreateIndex
CREATE INDEX "Violation_category_idx" ON "Violation"("category");
