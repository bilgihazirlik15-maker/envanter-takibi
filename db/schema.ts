import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const items = sqliteTable("items", {
  barcode: text("barcode").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("IN"),
  holder: text("holder").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
  removed: integer("removed").notNull().default(0),
});

export const movements = sqliteTable("movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  time: text("time").notNull(),
  barcode: text("barcode").notNull(),
  itemName: text("item_name").notNull(),
  action: text("action").notNull(),
  person: text("person").notNull().default(""),
  note: text("note").notNull().default(""),
});
