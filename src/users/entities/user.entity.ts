import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { UserProfile } from '@user-profile/entities/user-profile.entity';
import { RefreshToken } from '@refresh-token/entities/refresh-token.entity';
import { UserToken } from '@user-token/entities/user-token.entity';
import { Role } from '@roles/entities/role.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'citext', unique: true })
  username: string;

  @Column({ type: 'citext', unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  provider: string;

  // @CreateDateColumn({ type: 'timestamptz' })
  // createdAt: Date;

  // @UpdateDateColumn({ type: 'timestamptz' })
  // updatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // One-to-One: Profile
  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile: UserProfile;

  // One-to-Many: Refresh Tokens
  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  // One-to-Many: One-time Tokens
  @OneToMany(() => UserToken, (token) => token.user)
  tokens: UserToken[];

  // Many-to-Many: Roles
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
