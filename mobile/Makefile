.PHONY: build submit release simulator

build:
	npx eas build --platform ios --profile production

submit:
	npx eas submit --platform ios --latest

release: build submit

simulator:
	npx expo start --ios
