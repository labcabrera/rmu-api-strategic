const StrategicGame = require("../models/strategic-game-model");

const findById = async (gameId) => {
    const readedGame = await StrategicGame.findById(gameId);
    if (!readedGame) {
        throw new { status: 404, message: "Strategic game not found" };
    }
    return toJSON(readedGame);
}

const findAll = async (page, size) => {
    const skip = page * size;
    const readedGames = await StrategicGame.find().skip(skip).limit(size).sort({ updatedAt: -1 });
    const count = await StrategicGame.countDocuments();
    const content = readedGames.map(toJSON);
    return { content: content, pagination: { page: page, size: size, totalElements: count } };
};

const save = async (user, data) => {
    const { name, description, realm } = data;
    const newGame = new StrategicGame({ name, realm, description, user });
    newGame.status = 'created';
    const savedGame = await newGame.save();
    return toJSON(savedGame);
};

const update = async (gameId, data) => {
    const { name, description } = data;
    const updatedGame = await StrategicGame.findByIdAndUpdate(gameId, { name, description }, { new: true });
    if (!updatedGame) {
        throw new { status: 404, message: "Strategic game not found" };
    };
    return toJSON(updatedGame);
};

const deleteById = async (gameId) => {
    const deletedGame = await StrategicGame.findByIdAndDelete(gameId);
    if (!deletedGame) {
        throw { status: 404, message: "Strategic game not found" };
    }
}


const toJSON = (game) => {
    return {
        id: game._id,
        name: game.name,
        realm: game.realm,
        description: game.description,
        user: game.user,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt
    };
}

module.exports = {
    findById,
    findAll,
    save,
    update,
    deleteById
};