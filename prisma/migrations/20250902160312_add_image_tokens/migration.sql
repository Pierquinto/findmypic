-- CreateTable
CREATE TABLE "ImageToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImageToken_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImageToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageToken_token_key" ON "ImageToken"("token");

-- CreateIndex
CREATE INDEX "ImageToken_token_idx" ON "ImageToken"("token");

-- CreateIndex
CREATE INDEX "ImageToken_expiresAt_idx" ON "ImageToken"("expiresAt");
