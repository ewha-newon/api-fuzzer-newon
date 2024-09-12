# api-fuzzer-newon
KissPeter님의 APIFuzzer를 기반으로 만들어본 api fuzzer
- json 파일 작성 자동화 -> 아직 수정중...
- 아이콘 명령 실행 -> 구현 추가


## 공식문서 usage

```
$$ usage: APIFuzzer [-h] [-s SRC_FILE] [--src_url SRC_URL] [-r REPORT_DIR] [--level LEVEL] [-u ALTERNATE_URL] [-t TEST_RESULT_DST]
                 [--log {critical,fatal,error,warn,warning,info,debug,notset}] [--basic_output BASIC_OUTPUT] [--headers HEADERS] [-v ,--version]

APIFuzzer configuration

optional arguments:
  -h, --help            show this help message and exit
  -s SRC_FILE, --src_file SRC_FILE
                        API definition file path. JSON and YAML format is supported
  --src_url SRC_URL     API definition url. JSON and YAML format is supported
  -r REPORT_DIR, --report_dir REPORT_DIR
                        Directory where error reports will be saved. Default is temporally generated directory
  --level LEVEL         Test deepness: [1,2], the higher is the deeper (In progress)
  -u ALTERNATE_URL, --url ALTERNATE_URL
                        Use CLI defined url instead compile the url from the API definition. Useful for testing
  -t TEST_RESULT_DST, --test_report TEST_RESULT_DST
                        JUnit test result xml save path
  --log {critical,fatal,error,warn,warning,info,debug,notset}
                        Use different log level than the default WARNING
  --basic_output BASIC_OUTPUT
                        Use basic output for logging (useful if running in jenkins). Example --basic_output=True
  --headers HEADERS     Http request headers added to all request. Example: '[{"Authorization": "SuperSecret"}, {"Auth2": "asd"}]' 
```
