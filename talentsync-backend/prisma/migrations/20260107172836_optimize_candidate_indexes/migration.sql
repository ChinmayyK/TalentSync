-- CreateIndex
CREATE INDEX "idx_candidate_list" ON "Candidate"("tenantId", "deletedAt", "stage");

-- CreateIndex
CREATE INDEX "idx_candidate_sort" ON "Candidate"("tenantId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "idx_candidate_email" ON "Candidate"("tenantId", "email");
