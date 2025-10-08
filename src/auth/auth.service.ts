import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<any> {
    const { email, password, firstName, lastName } = registerDto;
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });
    await user.save();

    const payload = { 
      sub: user._id, 
      email: user.email, 
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;
    const user = await this.userModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      sub: user._id, 
      email: user.email, 
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
