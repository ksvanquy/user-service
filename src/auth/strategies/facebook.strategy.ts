import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('FACEBOOK_CLIENT_ID');
    const clientSecret = configService.get<string>('FACEBOOK_CLIENT_SECRET');
    const callbackURL = configService.get<string>('FACEBOOK_CALLBACK_URL');
    
    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error('Facebook OAuth credentials are not properly configured');
    }
    
    super({
      clientID,
      clientSecret,
      callbackURL,
      profileFields: ['emails', 'name', 'photos'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ) {
    const email = profile.emails?.[0]?.value || '';
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';
    const picture = profile.photos?.[0]?.value || '';
    
    const user = {
      email,
      name: `${firstName} ${lastName}`.trim(),
      picture,
      provider: 'facebook',
    };
    done(null, user);
  }
}
