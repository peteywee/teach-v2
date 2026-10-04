CREATE TABLE "identity_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"credential_type" text NOT NULL,
	"password_hash" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_credential_type_check" CHECK ("identity_credentials"."credential_type" IN ('PASSWORD','PIN','OAUTH_LINK')),
	CONSTRAINT "identity_credential_hash_check" CHECK (((("identity_credentials"."credential_type" IN ('PASSWORD','PIN')) AND ("identity_credentials"."password_hash" IS NOT NULL)) OR (("identity_credentials"."credential_type" = 'OAUTH_LINK') AND ("identity_credentials"."password_hash" IS NULL))))
);
--> statement-breakpoint
ALTER TABLE "identity_credentials" ADD CONSTRAINT "identity_credentials_identity_id_identity_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE restrict ON UPDATE no action;