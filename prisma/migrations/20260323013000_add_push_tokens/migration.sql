CREATE TABLE "push_tokens" (
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("token")
);

CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");
CREATE INDEX "push_tokens_platform_idx" ON "push_tokens"("platform");

ALTER TABLE "push_tokens"
ADD CONSTRAINT "push_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
