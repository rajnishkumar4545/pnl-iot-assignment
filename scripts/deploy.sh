if [[ $BUILD=1 ]]; then
    echo Build started on $(date)
    # install lambda dependecy, may be do it using venv
    pip install -r src/lambda/requirements.txt -t src/lambda/
    zip -r src/lambda/demo_lambda.zip src/lambda/
    cdk bootstrap
    cdk synth
    zip -r artifacts.zip cdk.out
    echo Build completed on `date`
else
    echo Deploy started in $(date)
    ls -laRt
    echo Deploy completed on $(date)
fi
