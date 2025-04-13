import * as bcrypt from 'bcrypt';

export class HashUtil {
  private static readonly SALT_ROUNDS = 10;

  /**
   * Hash a string using bcrypt
   * @param data The string to hash
   * @returns The hashed string
   */
  static async hash(data: string): Promise<string> {
    return bcrypt.hash(data, this.SALT_ROUNDS);
  }

  /**
   * Compare a string with a bcrypt hash
   * @param data The string to compare
   * @param hash The hash to compare against
   * @returns True if the string matches the hash
   */
  static async compare(data: string, hash: string): Promise<boolean> {
    return bcrypt.compare(data, hash);
  }
}
