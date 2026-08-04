import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../../src/config/db.js';
import User from '../../src/modules/auth/user.model.js';
import { Workspace } from '../../src/modules/workspace/workspace.model.js';
import { Board } from '../../src/modules/board/board.model.js';
import boardService from '../../src/modules/board/board.service.js';

dotenv.config();

async function run() {
  await connectDB();

  console.log('--- STARTING MANUAL VERIFICATION FOR BOARDS ---');

  // 1. Setup Test Users
  console.log('\nSetting up test users...');
  
  await User.deleteMany({ email: { $in: ['owner@test.com', 'admin@test.com', 'member@test.com', 'viewer@test.com', 'stranger@test.com'] } });
  
  const owner = await User.create({ email: 'owner@test.com', password: 'password123', fullName: 'Workspace Owner', isActive: true });
  const admin = await User.create({ email: 'admin@test.com', password: 'password123', fullName: 'Workspace Admin', isActive: true });
  const member = await User.create({ email: 'member@test.com', password: 'password123', fullName: 'Workspace Member', isActive: true });
  const viewer = await User.create({ email: 'viewer@test.com', password: 'password123', fullName: 'Workspace Viewer', isActive: true });
  const stranger = await User.create({ email: 'stranger@test.com', password: 'password123', fullName: 'Stranger', isActive: true });

  console.log('Users created.');

  // 2. Setup Test Workspace
  console.log('\nSetting up test workspace...');
  await Workspace.deleteMany({ slug: 'board-test-workspace' });

  const workspace = await Workspace.create({
    name: 'Board Test Workspace',
    slug: 'board-test-workspace',
    ownerId: owner._id,
    members: [
      { userId: owner._id, role: 'admin' },
      { userId: admin._id, role: 'admin' },
      { userId: member._id, role: 'member' },
      { userId: viewer._id, role: 'viewer' }
    ]
  });

  console.log(`Workspace created: ${workspace._id}`);

  // Clean up any board remaining
  await Board.deleteMany({ workspaceId: workspace._id });

  // 3. Test Board Creation
  console.log('\n--- 3. Testing Board Creation ---');
  
  // A. Member creates public board (should succeed)
  let memberBoard;
  try {
    memberBoard = await boardService.createBoard(workspace._id, member._id, {
      name: 'Sprint Planning',
      description: 'Sprint planning board',
      visibility: 'workspace'
    });
    console.log('✅ Member successfully created a workspace-visible board.');
  } catch (err) {
    console.error('❌ Member failed to create board:', err.message);
  }

  // B. Member creates private board (should succeed)
  let privateBoard;
  try {
    privateBoard = await boardService.createBoard(workspace._id, member._id, {
      name: 'Confidential Strategy',
      description: 'Top secret strategy',
      visibility: 'private'
    });
    console.log('✅ Member successfully created a private board.');
  } catch (err) {
    console.error('❌ Member failed to create private board:', err.message);
  }

  // C. Viewer tries to create board (should fail)
  try {
    await boardService.createBoard(workspace._id, viewer._id, {
      name: 'Viewer Board',
      visibility: 'workspace'
    });
    console.error('❌ Viewer created board (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Viewer blocked from creating board:', err.message);
  }

  // D. Stranger tries to create board (should fail)
  try {
    await boardService.createBoard(workspace._id, stranger._id, {
      name: 'Stranger Board',
      visibility: 'workspace'
    });
    console.error('❌ Stranger created board (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Stranger blocked from creating board:', err.message);
  }

  // E. Unique Board Name Check (should fail)
  try {
    await boardService.createBoard(workspace._id, admin._id, {
      name: 'Sprint Planning',
      visibility: 'workspace'
    });
    console.error('❌ Allowed duplicate board name in workspace (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Blocked duplicate board name:', err.message);
  }

  // 4. Test Board Visibility and Listing
  console.log('\n--- 4. Testing Board Visibility and Listing ---');

  // A. Admin listings (should see both Sprint Planning and Confidential Strategy)
  try {
    const list = await boardService.listBoards(workspace._id, admin._id, {});
    console.log(`✅ Admin lists boards: Found ${list.boards.length} board(s) (Expected: 2)`);
  } catch (err) {
    console.error('❌ Admin failed to list boards:', err.message);
  }

  // B. Member (creator of private board) listing (should see both)
  try {
    const list = await boardService.listBoards(workspace._id, member._id, {});
    console.log(`✅ Member (creator) lists boards: Found ${list.boards.length} board(s) (Expected: 2)`);
  } catch (err) {
    console.error('❌ Member failed to list boards:', err.message);
  }

  // C. Viewer (not creator of private board) listing (should see only Sprint Planning)
  try {
    const list = await boardService.listBoards(workspace._id, viewer._id, {});
    console.log(`✅ Viewer lists boards: Found ${list.boards.length} board(s) (Expected: 1, Name: '${list.boards[0]?.name}')`);
  } catch (err) {
    console.error('❌ Viewer failed to list boards:', err.message);
  }

  // D. Stranger listing (should fail)
  try {
    await boardService.listBoards(workspace._id, stranger._id, {});
    console.error('❌ Stranger listed boards (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Stranger blocked from listing boards:', err.message);
  }

  // 5. Test Board Details Fetching
  console.log('\n--- 5. Testing Board Details Fetching ---');

  // A. Viewer gets workspace board details (should succeed)
  try {
    await boardService.getBoardDetails(memberBoard._id, viewer._id);
    console.log('✅ Viewer fetched details for workspace-visible board.');
  } catch (err) {
    console.error('❌ Viewer failed to fetch details for workspace board:', err.message);
  }

  // B. Viewer gets private board details (should fail)
  try {
    await boardService.getBoardDetails(privateBoard._id, viewer._id);
    console.error('❌ Viewer fetched private board details (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Viewer blocked from private board details:', err.message);
  }

  // C. Admin gets private board details (should succeed)
  try {
    await boardService.getBoardDetails(privateBoard._id, admin._id);
    console.log('✅ Admin fetched private board details.');
  } catch (err) {
    console.error('❌ Admin failed to fetch private board details:', err.message);
  }

  // 6. Test Board Updates
  console.log('\n--- 6. Testing Board Updates ---');

  // A. Creator updates board name/description (should succeed)
  try {
    const updated = await boardService.updateBoard(memberBoard._id, member._id, {
      name: 'Sprint Planning V2',
      description: 'Updated description'
    });
    console.log(`✅ Creator updated board name to: '${updated.name}'`);
    memberBoard = updated;
  } catch (err) {
    console.error('❌ Creator failed to update board:', err.message);
  }

  // B. Non-creator Member tries to update board (should fail)
  try {
    await boardService.updateBoard(memberBoard._id, admin._id, {
      name: 'Admin Hijacked Name'
    });
    console.log('✅ Workspace Admin is allowed to update board.');
  } catch (err) {
    console.error('❌ Admin failed to update board:', err.message);
  }

  // C. Viewer tries to update board (should fail)
  try {
    await boardService.updateBoard(memberBoard._id, viewer._id, {
      name: 'Viewer Hijacked Name'
    });
    console.error('❌ Viewer updated board (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Viewer blocked from updating board:', err.message);
  }

  // D. Duplicate board name check on update (should fail)
  try {
    await boardService.updateBoard(memberBoard._id, member._id, {
      name: 'Confidential Strategy'
    });
    console.error('❌ Allowed duplicate board name on update (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Blocked duplicate board name on update:', err.message);
  }

  // 7. Test Board Archiving / Restoring / Mutations on Archived
  console.log('\n--- 7. Testing Board Archiving, Restoring and Mutation Constraints ---');

  // A. Member tries to archive (should fail)
  try {
    await boardService.archiveBoard(memberBoard._id, member._id);
    console.error('❌ Member archived board (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Member blocked from archiving board:', err.message);
  }

  // B. Admin archives board (should succeed)
  try {
    const archived = await boardService.archiveBoard(memberBoard._id, admin._id);
    console.log(`✅ Admin archived board: isArchived = ${archived.isArchived}`);
    memberBoard = archived;
  } catch (err) {
    console.error('❌ Admin failed to archive board:', err.message);
  }

  // C. Try updating archived board (should fail)
  try {
    await boardService.updateBoard(memberBoard._id, member._id, {
      name: 'Archived Board Update'
    });
    console.error('❌ Allowed updating archived board (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Blocked update on archived board:', err.message);
  }

  // D. Admin restores board (should succeed)
  try {
    const restored = await boardService.restoreBoard(memberBoard._id, admin._id);
    console.log(`✅ Admin restored board: isArchived = ${restored.isArchived}`);
    memberBoard = restored;
  } catch (err) {
    console.error('❌ Admin failed to restore board:', err.message);
  }

  // 8. Test Workspace Archived Constraints
  console.log('\n--- 8. Testing Workspace Archived Constraints ---');

  // Archive workspace
  workspace.isArchived = true;
  await workspace.save();
  console.log('Workspace isArchived flag set to true.');

  // Try creating a board (should fail)
  try {
    await boardService.createBoard(workspace._id, admin._id, {
      name: 'New Board under Archived Workspace'
    });
    console.error('❌ Allowed creating board in archived workspace (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Blocked board creation in archived workspace:', err.message);
  }

  // Try updating a board (should fail)
  try {
    await boardService.updateBoard(memberBoard._id, admin._id, {
      description: 'Try updating archived workspace board'
    });
    console.error('❌ Allowed updating board in archived workspace (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Blocked board update in archived workspace:', err.message);
  }

  // Try archiving a board (should fail)
  try {
    await boardService.archiveBoard(memberBoard._id, admin._id);
    console.error('❌ Allowed archiving board in archived workspace (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Blocked board archive in archived workspace:', err.message);
  }

  // Restore workspace
  workspace.isArchived = false;
  await workspace.save();
  console.log('Workspace isArchived flag restored to false.');

  // 9. Test Board Soft Deletion
  console.log('\n--- 9. Testing Board Soft Deletion ---');

  // A. Member tries to delete (should fail)
  try {
    await boardService.softDeleteBoard(memberBoard._id, member._id);
    console.error('❌ Member soft-deleted board (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Member blocked from deleting board:', err.message);
  }

  // B. Admin deletes board (should succeed)
  try {
    await boardService.softDeleteBoard(memberBoard._id, admin._id);
    console.log('✅ Admin soft-deleted board.');
  } catch (err) {
    console.error('❌ Admin failed to delete board:', err.message);
  }

  // C. Try fetching details of deleted board (should fail with 404)
  try {
    await boardService.getBoardDetails(memberBoard._id, admin._id);
    console.error('❌ Fetched deleted board details (SHOULD HAVE FAILED)');
  } catch (err) {
    console.log('✅ Deleted board details request returned error (Expected 404):', err.message);
  }

  // 10. Clean up
  console.log('\nCleaning up test records...');
  await Board.deleteMany({ workspaceId: workspace._id });
  await Workspace.deleteOne({ _id: workspace._id });
  await User.deleteMany({ email: { $in: ['owner@test.com', 'admin@test.com', 'member@test.com', 'viewer@test.com', 'stranger@test.com'] } });
  console.log('Clean up complete.');

  await mongoose.connection.close();
  console.log('\n--- VERIFICATION COMPLETED ---');
}

run().catch((err) => {
  console.error('Fatal error during execution:', err);
  process.exit(1);
});
