import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CreateUserDto } from '../dto/create-user.dto';

@Schema()
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, minlength: 8, maxlength: 20 })
  password: string;

  @Prop({ default: [] })
  bingoCard: (string | number)[];
}

export const UserSchema = SchemaFactory.createForClass(User);
