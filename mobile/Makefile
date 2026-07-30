.PHONY: build submit release

build:
	npx eas build --platform ios --profile production

submit:
	npx eas submit --platform ios --latest

release: build submit
