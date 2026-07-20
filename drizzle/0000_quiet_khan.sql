CREATE TABLE `items` (
	`barcode` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'IN' NOT NULL,
	`holder` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	`removed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`time` text NOT NULL,
	`barcode` text NOT NULL,
	`item_name` text NOT NULL,
	`action` text NOT NULL,
	`person` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
