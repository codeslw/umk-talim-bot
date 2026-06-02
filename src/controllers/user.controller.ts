const { editUser, getUsers, removeUser } = require('../services/user.service');

async function getUsersController(req, res) {
  res.json({ data: await getUsers(req.query) });
}

async function patchUser(req, res) {
  res.json({ data: await editUser(req.params.id, req.body) });
}

async function deleteUserController(req, res) {
  await removeUser(req.params.id);
  res.status(204).send();
}

module.exports = {
  getUsers: getUsersController,
  patchUser,
  deleteUser: deleteUserController
};
