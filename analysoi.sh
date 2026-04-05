#!/bin/bash

echo "Repository analysis started"

echo "Detected languages:" | tee analysis_report.txt

find . -type f -name "*.py" ! -path "./.git/*" ! -path "./.github/*" | grep -q . && echo "- Python" | tee -a analysis_report.txt
find . -type f -name "*.js" ! -path "./.git/*" ! -path "./.github/*" | grep -q . && echo "- JavaScript" | tee -a analysis_report.txt
find . -type f -name "*.ts" ! -path "./.git/*" ! -path "./.github/*" | grep -q . && echo "- TypeScript" | tee -a analysis_report.txt
find . -type f -name "*.java" ! -path "./.git/*" ! -path "./.github/*" | grep -q . && echo "- Java" | tee -a analysis_report.txt
find . -type f -name "*.html" ! -path "./.git/*" ! -path "./.github/*" | grep -q . && echo "- HTML" | tee -a analysis_report.txt
find . -type f -name "*.css" ! -path "./.git/*" ! -path "./.github/*" | grep -q . && echo "- CSS" | tee -a analysis_report.txt

echo "" | tee -a analysis_report.txt
echo "Design patterns detected:" | tee -a analysis_report.txt

grep -R -n -E "getInstance|static instance" . --exclude="analysis_report.txt" --exclude-dir=".git" --exclude-dir=".github" > /dev/null && echo "- Singleton" | tee -a analysis_report.txt
grep -R -n -E "create[A-Z]|factory" . --exclude="analysis_report.txt" --exclude-dir=".git" --exclude-dir=".github" > /dev/null && echo "- Factory Method" | tee -a analysis_report.txt
grep -R -n -E "Strategy|interface" . --exclude="analysis_report.txt" --exclude-dir=".git" --exclude-dir=".github" > /dev/null && echo "- Strategy" | tee -a analysis_report.txt
grep -R -n -E "notify|subscribe|observer" . --exclude="analysis_report.txt" --exclude-dir=".git" --exclude-dir=".github" > /dev/null && echo "- Observer" | tee -a analysis_report.txt
grep -R -n -E "Decorator|wrap" . --exclude="analysis_report.txt" --exclude-dir=".git" --exclude-dir=".github" > /dev/null && echo "- Decorator" | tee -a analysis_report.txt

echo "Analysis ready"
