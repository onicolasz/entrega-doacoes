-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DonationType" AS ENUM ('TESTE');

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address_city" TEXT NOT NULL,
    "address_state" TEXT NOT NULL,
    "address_street" TEXT NOT NULL,
    "address_number" INTEGER NOT NULL,
    "address_complement" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Transporter" (
    "transporter_id" SERIAL NOT NULL,
    "cpf" TEXT NOT NULL,
    "document_front" TEXT NOT NULL,
    "document_back" TEXT NOT NULL,
    "score_points" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Transporter_pkey" PRIMARY KEY ("transporter_id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "donation_id" SERIAL NOT NULL,
    "type" "DonationType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight" DECIMAL(7,2) NOT NULL,
    "points" INTEGER NOT NULL,
    "from_latitude" DECIMAL(10,7) NOT NULL,
    "from_longitude" DECIMAL(10,7) NOT NULL,
    "destination_latitude" DECIMAL(10,7) NOT NULL,
    "destination_longitude" DECIMAL(10,7) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("donation_id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "delivery_id" SERIAL NOT NULL,
    "transporter_id" INTEGER NOT NULL,
    "donation_id" INTEGER NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "gps_final_location" TEXT,
    "delivery_proof" TEXT,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("delivery_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_user_id_key" ON "User"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Transporter_transporter_id_key" ON "Transporter"("transporter_id");

-- CreateIndex
CREATE UNIQUE INDEX "Transporter_user_id_key" ON "Transporter"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_donation_id_key" ON "Donation"("donation_id");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_delivery_id_key" ON "Delivery"("delivery_id");

-- AddForeignKey
ALTER TABLE "Transporter" ADD CONSTRAINT "Transporter_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_transporter_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "Transporter"("transporter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "Donation"("donation_id") ON DELETE RESTRICT ON UPDATE CASCADE;
