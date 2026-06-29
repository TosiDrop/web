CREATE TABLE `users` (
	`stake_address` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`bio` text,
	`avatar_url` text,
	`wallet_provider` text,
	`onboarding_completed` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
