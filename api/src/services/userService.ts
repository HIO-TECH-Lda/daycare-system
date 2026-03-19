import User from '../models/User';

export class UserService {
  static async findAll(
    role?: string,
    search?: string,
    page = 1,
    limit = 50
  ): Promise<{ users: Array<{ id: string; name: string; email: string; phone: string; role: string }>; total: number }> {
    const query: any = { status: 'active' };
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [rawUsers, total] = await Promise.all([
      User.find(query)
        .select('firstName lastName email phone role')
        .sort({ firstName: 1, lastName: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    const users = rawUsers.map((u) => ({
      id: (u._id as any).toString(),
      name: u.fullName,
      email: u.email,
      phone: u.phone || '',
      role: u.role
    }));

    return { users, total };
  }
}
