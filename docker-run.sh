#!/bin/bash

docker stop rmu-api-strategic

docker rm rmu-api-strategic

docker rmi labcabrera/rmu-api-strategic:latest

docker build -t labcabrera/rmu-api-strategic:latest .

docker run -d -p 3002:3002 --network rmu-network --name rmu-api-strategic -h rmu-api-strategic -e MONGO_URI='mongodb://rmu-mongo:27017/rmu-strategic' -e PORT='3002' labcabrera/rmu-api-strategic:latest

docker logs -f rmu-api-strategic
