import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<Bingo>;

@Schema()
export class Bingo {
  @Prop({
    required: true,
  })
  bingoCard: (string | number)[];
}

export const BingoSchema = SchemaFactory.createForClass(Bingo);
