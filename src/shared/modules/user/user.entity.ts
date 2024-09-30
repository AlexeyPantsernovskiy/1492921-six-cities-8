import { defaultClasses, getModelForClass, prop, modelOptions } from '@typegoose/typegoose';
import { TUser } from '../../types/index.js';
import { EMPTY_AVATAR } from '../../../const/data.js';
import { createSHA256 } from '../../helpers/index.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface UserEntity extends defaultClasses.Base {}

@modelOptions({
  schemaOptions: {
    collection: 'users',
    timestamps: true,
  }
})

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class UserEntity extends defaultClasses.TimeStamps implements TUser {
  @prop({ trim: true, required: true, default: '' })
  public name: string;

  @prop({ unique: true, required: true })
  public email: string;

  @prop({ required: false, default: EMPTY_AVATAR })
  public avatarUrl?: string;

  @prop({ required: true, default: '' })
  public password: string;

  @prop({ required: true })
  public isPro: boolean;

  constructor(userData: TUser) {
    super();

    this.name = userData.name;
    this.email = userData.email;
    this.avatarUrl = userData.avatarUrl;
    this.isPro = userData.isPro;
  }

  public setPassword(password: string, salt: string) {
    this.password = createSHA256(password, salt);
  }

  public getPassword() {
    return this.password;
  }
}

export const UserModel = getModelForClass(UserEntity);