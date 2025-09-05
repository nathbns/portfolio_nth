import Image from "next/image";

export default function Home() {
  return (
    <div className="pb-16 px-4 mx-auto max-w-4xl">
      <div className="flex justify-end">
        <a
          href="/blog"
          className="text-foreground/80 hover:text-foreground transition-colors duration-200 text-sm sm:text-base underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          Blog - Today I Learned
        </a>
      </div>
      <section className="flex flex-row items-center justify-center gap-2 sm:gap-4 md:gap-8 mb-8 sm:mb-12">
        <div className="shrink-0 rounded-full ring-1 ring-foreground/10 p-1 bg-background">
          <Image
            src="/pdp.png"
            alt="Portrait"
            width={200}
            height={200}
            priority
            className="rounded-full w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] md:w-[200px] md:h-[200px] lg:w-[250px] lg:h-[250px]"
          />
        </div>
        <div className="flex-1 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">
          <Image
            src="/arrow_name.png"
            alt="name"
            width={500}
            height={500}
            priority
            className="w-full h-auto"
          />
        </div>
      </section>
      <section className="flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          <p className="text-sm sm:text-base md:text-lg leading-relaxed">
            Currently studying at{" "}
            <a
              href="http://licence-info.univ-lyon1.fr/"
              target="_blank"
              className="text-foreground/80"
            >
              <span className="underline">University Claude Bernard Lyon 1.</span>
            </a>
            <br />
            <br />
            <span style={{ color: "#7aa2f7" }}>void</span>{" "}
            <span style={{ color: "#bb9af7" }}>little_bit_about_me</span>
            <span style={{ color: "#c0caf5" }}>(</span>
            <span style={{ color: "#9ece6a" }}>Myself self</span>
            <span style={{ color: "#c0caf5" }}>)</span>
            <span style={{ color: "#c0caf5" }}>{" {"}</span>
            <div className="pl-2 sm:pl-4 mt-2">
              I study computer science at university Claude Bernard Lyon
              1.
              <br />
              I&apos;m in my third year of bachelor degree in cs.
              <br />
            </div>
            <span style={{ color: "#c0caf5" }}>{" }"}</span>
            <br />
            <br />
            <span style={{ color: "#7aa2f7" }}>func</span>{" "}
            <span style={{ color: "#bb9af7" }}>interests</span>
            <span style={{ color: "#c0caf5" }}>(</span>
            <span style={{ color: "#9ece6a" }}>
              nn, ml, lowLevelSys, programmingLang
            </span>
            <span style={{ color: "#c0caf5" }}>)</span>
            <span style={{ color: "#c0caf5" }}>{" {"}</span>
            <div className="pl-2 sm:pl-4 mt-2">
              I like building{" "}
              <a
                href="https://en.wikipedia.org/wiki/Neural_network_(machine_learning)"
                target="_blank"
                className="text-foreground/80"
              >
                <span className="underline">neural networks</span>
              </a>
              , i&apos;m interested in the field of AI and machine learning.
            </div>
            <span style={{ color: "#c0caf5" }}>{" }"}</span>
            <div className="flex justify-center pt-6 sm:pt-8">
              <Image
                src="/nn.png"
                alt="neural network"
                width={500}
                height={500}
                priority
                className="w-full h-auto max-w-[280px] sm:max-w-[400px] md:max-w-[500px]"
              />
            </div>
            <br />
            <br />
            <span style={{ color: "#7aa2f7" }}>pub fn{" <T>"}</span>{" "}
            <span style={{ color: "#bb9af7" }}>outsideOfClassIDoProjects</span>
            <span style={{ color: "#c0caf5" }}>(</span>
            <span style={{ color: "#9ece6a" }}>project: &mut T, val: T</span>
            <span style={{ color: "#c0caf5" }}>)</span>
            <span style={{ color: "#c0caf5" }}>{" {"}</span>
            <br />
            <div className="pl-2 sm:pl-4 mt-2 space-y-4">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span>
                    Project 1:{" "}
                    <a
                      href="https://github.com/nathbns/gitact"
                      target="_blank"
                      className="text-foreground/80 underline"
                    >
                      Gitact
                    </a>
                  </span>
                  <div className="flex items-center gap-2">
                    <Image
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg"
                      alt="Go logo"
                      width={20}
                      height={20}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </div>
                </div>
                <p className="text-sm sm:text-base">
                  A beautiful, modern terminal interface for exploring GitHub
                  profiles, repositories, and activity.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span>
                    Project 2:{" "}
                    <a
                      href="https://github.com/nathbns/equaTrix"
                      target="_blank"
                      className="text-foreground/80 underline"
                    >
                      {" "}
                      EquaTrix
                    </a>
                  </span>
                  <div className="flex items-center gap-2">
                    <Image
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg"
                      alt="C++ logo"
                      width={20}
                      height={20}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <Image
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/qt/qt-original.svg"
                      alt="Qt logo"
                      width={20}
                      height={20}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </div>
                </div>
                <p className="text-sm sm:text-base">
                  EquaTrix is a cross-platform math application that allows you
                  to manipulate matrices, solve systems of linear equations,
                  integrate functions, and analyze mathematical functions. It is
                  coded in C++ using the Qt framework.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span>
                    Project 3:{" "}
                    <a
                      href="https://github.com/nathbns/doodleJump_like"
                      target="_blank"
                      className="text-foreground/80 underline"
                    >
                      {" "}
                      BPE, Word Piece et Unigram Tokenizer
                    </a>
                  </span>
                  <div className="flex items-center gap-2">
                    <Image
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"
                      alt="Python logo"
                      width={20}
                      height={20}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <Image
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg"
                      alt="pytorch logo"
                      width={20}
                      height={20}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <Image
                      src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg"
                      alt="huggingface logo"
                      width={20}
                      height={20}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </div>
                </div>
                <p className="text-sm sm:text-base">
                  This project explores different tokenization techniques and
                  models. It provides hands-on implementations of the key
                  components that make up modern tokenizers.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span>
                    Project 4:{" "}
                    <a
                      href="https://github.com/nathbns/doodleJump_like"
                      target="_blank"
                      className="text-foreground/80 underline"
                    >
                      {" "}
                      DoodleJump like
                    </a>
                  </span>
                  <div className="flex items-center gap-2">
                    <Image
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg"
                      alt="C++ logo"
                      width={20}
                      height={20}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <Image
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sdl/sdl-original.svg"
                      alt="sdl logo"
                      width={20}
                      height={20}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </div>
                </div>
                <p className="text-sm sm:text-base">
                  DoodleJump like is a 2D platformer game made in C++ using the
                  SDL library.
                </p>
              </div>
            </div>
            <span style={{ color: "#c0caf5" }}>{" }"}</span>
            <br />
            <br />
            <span style={{ color: "#7aa2f7" }}>def</span>{" "}
            <span style={{ color: "#bb9af7" }}>learning_deep_learning</span>
            <span style={{ color: "#c0caf5" }}>(</span>
            <span style={{ color: "#9ece6a" }}>self</span>
            <span style={{ color: "#c0caf5" }}>)</span>
            <span style={{ color: "#c0caf5" }}>:</span>
            <div className="pl-2 sm:pl-4 mt-2 space-y-2">
              <p className="text-sm sm:text-base">
                I&apos;m learning deep learning with{" "}
                <a
                  href="https://karpathy.ai/"
                  target="_blank"
                  className="text-foreground/80 underline"
                >
                  <span className="underline">karpathy</span>
                </a>
                .
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm sm:text-base">
                  learning{" "}
                  <a
                    href="https://www.python.org/"
                    target="_blank"
                    className="text-foreground/80 underline"
                  >
                    python
                  </a>{" "}
                  /{" "}
                  <a
                    href="https://pytorch.org/"
                    target="_blank"
                    className="text-foreground/80 underline"
                  >
                    pytorch
                  </a>
                </span>
                <div className="flex items-center gap-2">
                  <Image
                    src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"
                    alt="python logo"
                    width={20}
                    height={20}
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                  <Image
                    src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg"
                    alt="pytorch logo"
                    width={20}
                    height={20}
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <a
                  href="https://huggingface.co/"
                  target="_blank"
                  className="text-foreground/80 underline text-sm sm:text-base"
                >
                  huggingface
                </a>
                <Image
                  src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg"
                  alt="huggingface logo"
                  width={20}
                  height={20}
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
              </div>
            </div>
          </p>
        </div>
      </section>
    </div>
  );
}
