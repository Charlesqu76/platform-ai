#! /bin/bash

echo "***** start *****"

dockerOperate(){
    echo "docker build start"
    docker build -t platform-ai .
    docker stop platform-ai 
    docker rm platform-ai
    docker run -d --name platform-ai -p 3002:3002 platform-ai
    docker image prune -af
}

dockerOperate

echo "***** end *****"
