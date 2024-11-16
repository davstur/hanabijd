# Build the container

docker build --platform linux/amd64 -t hanabi .
docker tag hanabi gcr.io/hanabijd-366e9/hanabi
gcloud auth configure-docker
docker push gcr.io/hanabijd-366e9/hanabi


Deploy to Cloud Run
gcloud run deploy hanabi \
  --image gcr.io/hanabijd-366e9/hanabi \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1