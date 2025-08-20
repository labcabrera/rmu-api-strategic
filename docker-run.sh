#!/bin/bash

docker stop rmu-api-strategic

docker rm rmu-api-strategic

docker rmi labcabrera/rmu-api-strategic:latest

docker build -t labcabrera/rmu-api-strategic:latest .

docker run -d -p 3002:3002 --network rmu-network --name rmu-api-strategic -h rmu-api-strategic \
  -e PORT='3002' \
  -e RMU_MONGO_STRATEGIC_URI='mongodb://admin:admin@rmu-mongo:27017/rmu-strategic?authSource=admin' \
  -e RMU_API_CORE_URI='http://rmu-api-core:3001/v1' \
  -e RMU_IAM_TOKEN_URI='http://rmu-keycloak:8080/realms/rmu-local/protocol/openid-connect/token' \
  -e RMU_IAM_JWK_URI='http://rmu-keycloak:8080/realms/rmu-local/protocol/openid-connect/certs' \
  -e RMU_IAM_CLIENT_ID=rmu-client \
  -e RMU_IAM_CLIENT_SECRET=1tUzPc24SYJMPpX37g2eymEoS9C3Ttzw \
  -e RMU_KAFKA_BROKERS=rmu-kafka-broker:9092 \
  -e RMU_KAFKA_CLIENT_ID=rmu-api-strategic \
  labcabrera/rmu-api-strategic:latest

docker logs -f rmu-api-strategic
