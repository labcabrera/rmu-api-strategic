const express = require('express');
const router = express.Router();
//const StrategicGame = require("../models/strategic-game-model")
const strategicGameService = require("../services/strategic-game-service");

router.get('/', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const size = req.query.size ? parseInt(req.query.size) : 10;
        const response = await strategicGameService.findAll(page, size);
        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:gameId', async (req, res) => {
    try {
        const gameId = req.params.gameId;
        const readedGame = await strategicGameService.findById(gameId);
        res.json(readedGame);
    } catch (error) {
        res.status(error.status ? error.status : 500).json({ message: error.message, stack: error.stack });
    }
});

router.post('/', async (req, res) => {
    try {
        console.log("Strategic game creation << " + req.body.name);
        //TODO JWT
        const user = "lab.cabrera@gmail.com";
        const newGame = await strategicGameService.createStrategicGame(user, req.body);
        res.status(201).json(newGame);
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.patch('/:gameId', async (req, res) => {
    try {
        console.log("Strategic game update << " + req.params.gameId);
        const gameId = req.params.gameId;
        const updatedGame = await strategicGameService.update(gameId, req.body);
        res.json(updatedGame);
    } catch (error) {
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

router.delete('/:gameId', async (req, res) => {
    try {
        console.log("Strategic game delete << " + req.params.gameId);
        const gameId = req.params.gameId;
        const deletedGame = await strategicGameService.deleteById(gameId);
        res.status(204).send();
    } catch (error) {
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

module.exports = router;