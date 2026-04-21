const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const posts = await prisma.post.findMany({ select: { id: true, mediaUrl: true } });
  console.log("Posts:");
  console.log(posts.slice(0, 10));

  const users = await prisma.user.findMany({ select: { id: true, avatarUrl: true } });
  console.log("Users:");
  console.log(users.slice(0, 10));
}

check().catch(console.error).finally(() => prisma.$disconnect());
