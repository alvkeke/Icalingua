import { Knex } from "knex";
import Message from "../../types/Message";
import {
  DBVersion,
  MessageInSQLDB,
  MsgTableName,
} from "../../types/SQLTableTypes";

const upg6to7 = async (db: Knex) => {
  console.log(
    "Applying SQL Storage Provider Update:\n",
    "Version 7\n",
    "Fill the Rabbit Hole"
  );
  const msgTableNames = await db<MsgTableName>("msgTableName").select(
    "tableName"
  );
  const msgTableNamesAry = msgTableNames.map((obj) => obj.tableName);
  if (msgTableNamesAry.length !== 0) {
    const PAry = msgTableNamesAry.map(async (msgTableName) => {
      return new Promise<void>((resolve) => {
        const roomId = msgTableName.substring(3);
        const messageStream = db<Message>(msgTableName)
          .select("*")
          .stream();
        messageStream.on("data", async (data: Message) => {
          try {
            await db<MessageInSQLDB>("messages").insert({
              ...data,
              roomId: Number(roomId),
            });
          } catch (e) {
            console.error(e);
          }
        });
        messageStream.on("end", async () => {
          await db.schema.dropTable(msgTableName);
          resolve();
        });
      });
    });
    await Promise.all(PAry);
  }
  await db.schema.dropTable("msgTableName");
  await db<DBVersion>("dbVersion").update({ dbVersion: 7 });
};

export default upg6to7;
