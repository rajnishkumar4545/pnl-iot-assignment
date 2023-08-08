if [[ $BUILD == 1 ]]; then
    echo Build started on $(date)
    # install lambda dependecy, may be do it using venv
    # pip install -r src/lambda/requirements.txt -t src/lambda/
    pip install -r src/lambda_layer/requirements.txt -t src/lambda_layer/python
    zip -r src/lambda/demo_lambda.zip src/lambda/
    cdk bootstrap
    cdk synth
    zip -r artifacts.zip cdk.out
    echo Build completed on `date`
elif [[ $BUILD == 0 ]]; then
    echo Deploy started in $(date)
    ls -laRt
    echo Deploy completed on $(date)
else
    echo "PANIK : BUILD variable not set"
fi
