.PHONY: package
package: target/package.zip

target/package.zip: $(shell find chrome -type f)
	@mkdir -p $(@D)
	cd chrome; zip ../$@ *
