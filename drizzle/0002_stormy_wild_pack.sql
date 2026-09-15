CREATE SEQUENCE "public"."bill_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "email" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "settings" SET
  "phone"   = '8056552022',
  "email"   = 'makkalmarundhangam122@gmail.com',
  "address" = 'Pradhan Mantri Bhartiya Janaushadhi Kendra, Door No.4/106, MGR Street, Srinivasapuram, Paraniputhur, Chennai - 600122',
  "dl_no"   = 'TN/KPW20/01877, TN/KPW21/01877'
WHERE "id" = 1;
