const mongoose = require('mongoose');

const strategicGameSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    realm: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false
    }
}, {
    timestamps: true,
    collection: "strategic-games"
});

const StrategicGame = mongoose.model('StrategicGame', strategicGameSchema);

module.exports = StrategicGame;