import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema'; // Ensure this path points to your Schema file

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async validateUser(details: any) {
    console.log('Saving user to DB:', details.email);

    // We prepare the update object
    const updateData: any = {
      firstName: details.firstName,
      lastName: details.lastName,
      picture: details.picture,
      accessToken: details.accessToken,
    };

    // Only update refreshToken if Google actually sent a new one
    // This prevents overwriting a good token with 'undefined' on future logins
    if (details.refreshToken) {
      updateData.refreshToken = details.refreshToken;
    }

    return this.userModel.findOneAndUpdate(
      { email: details.email },
      { $set: updateData }, // Use $set to update specific fields
      { new: true, upsert: true }
    );
  }
}