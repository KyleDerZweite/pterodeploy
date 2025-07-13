#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { program } from 'commander';

const prisma = new PrismaClient();

// List all users
program
  .command('list-users')
  .description('List all users with their status')
  .action(async () => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log('\n📋 Users:');
      console.log('─'.repeat(80));
      users.forEach(user => {
        const roleIcon = user.role === 'admin' ? '👑' : '👤';
        const statusIcon = user.status === 'approved' ? '✅' : user.status === 'pending' ? '⏳' : '❌';
        console.log(`${roleIcon} ${statusIcon} ${user.username.padEnd(15)} ${user.role.padEnd(8)} ${user.status.padEnd(10)} ${user.email || 'No email'}`);
      });
      console.log('─'.repeat(80));
      console.log(`Total: ${users.length} users\n`);
    } catch (error) {
      console.error('❌ Error listing users:', error.message);
    } finally {
      await prisma.$disconnect();
    }
  });

// Approve user
program
  .command('approve <username>')
  .description('Approve a pending user')
  .action(async (username) => {
    try {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        console.log(`❌ User '${username}' not found`);
        return;
      }

      if (user.status === 'approved') {
        console.log(`✅ User '${username}' is already approved`);
        return;
      }

      await prisma.user.update({
        where: { username },
        data: { status: 'approved' },
      });

      console.log(`✅ User '${username}' has been approved`);
    } catch (error) {
      console.error('❌ Error approving user:', error.message);
    } finally {
      await prisma.$disconnect();
    }
  });

// Make admin
program
  .command('make-admin <username>')
  .description('Promote user to admin')
  .action(async (username) => {
    try {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        console.log(`❌ User '${username}' not found`);
        return;
      }

      if (user.role === 'admin') {
        console.log(`👑 User '${username}' is already an admin`);
        return;
      }

      await prisma.user.update({
        where: { username },
        data: { 
          role: 'admin',
          status: 'approved' // Ensure admin is approved
        },
      });

      console.log(`👑 User '${username}' has been promoted to admin`);
    } catch (error) {
      console.error('❌ Error promoting user:', error.message);
    } finally {
      await prisma.$disconnect();
    }
  });

// Create emergency admin
program
  .command('create-admin <username> <password>')
  .description('Create emergency admin user')
  .action(async (username, password) => {
    try {
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        console.log(`❌ User '${username}' already exists`);
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          role: 'admin',
          status: 'approved',
        },
      });

      console.log(`👑 Emergency admin '${username}' created successfully`);
    } catch (error) {
      console.error('❌ Error creating admin:', error.message);
    } finally {
      await prisma.$disconnect();
    }
  });

// Reset password
program
  .command('reset-password <username> <newPassword>')
  .description('Reset user password')
  .action(async (username, newPassword) => {
    try {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        console.log(`❌ User '${username}' not found`);
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await prisma.user.update({
        where: { username },
        data: { password: hashedPassword },
      });

      console.log(`🔑 Password reset for user '${username}'`);
    } catch (error) {
      console.error('❌ Error resetting password:', error.message);
    } finally {
      await prisma.$disconnect();
    }
  });

program
  .name('pterodeploy-admin')
  .description('PteroDeploy Admin CLI Tool')
  .version('1.0.0');

program.parse();