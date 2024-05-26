import { UserContext } from "@/app/contexts/user.context";
import { useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { faCarSide } from "@fortawesome/free-solid-svg-icons";

interface IUser {
  name?: string;
}

type Item = {
  name: string;
  quantity: number;
  weigth: number;
};

type CardProps = {
  userName: string;
  items: Item[];
  fromLocation: string;
  destinationLocation: string;
  deliveryStatus: string;
  transporter?: IUser;
};

const DonationCard: React.FC<CardProps> = ({
  userName,
  items,
  fromLocation,
  destinationLocation,
  deliveryStatus,
  transporter,
}) => {
  const { user } = useContext(UserContext);
  const firstItem = items[0];
  const additionalItems = items.length - 1;

  const { totalQuantity, totalWeight } = items.reduce(
    (acc, currentItem) => {
      return {
        totalQuantity: acc.totalQuantity + currentItem.quantity,
        totalWeight: acc.totalWeight + currentItem.weigth,
      };
    },
    { totalQuantity: 0, totalWeight: 0 }
  );

  const parseStatus = (status: string) => {
    switch (status) {
      case "FINISHED":
        return "Entregue";
      case "INCOMING":
        return "A caminho";
    }
  };

  return (
    <div className="flex p-4 bg-white text-black border border-green-700 text-xs rounded-2xl items-center m-4 drop-shadow-lg">
      <div className="flex-1">
        <div className="flex items-center mb-2">
          <div className="rounded-2xl p-2 bg-gray-200 font-medium flex items-center justify-center text-xs mr-2">
            {userName}
          </div>
          <div>
            {firstItem.quantity}{" "}
            {firstItem.quantity > 1 ? "unidades" : "unidade"} de{" "}
            {firstItem.name} e
            {additionalItems > 0 && (
              <span className="ml-1 bg-slate-200 rounded-full p-1">
                +{additionalItems} {additionalItems > 1 ? "itens" : "item"}
              </span>
            )}
          </div>
        </div>
        <div>
          <div>
            <strong>Origem: </strong> {fromLocation}
          </div>
          <div>
            <strong>Destino: </strong> {destinationLocation}
          </div>
        </div>
      </div>
      <div className="flex-2 ml-4">
        <p className="text-lg font-semibold">Total de itens {totalQuantity}</p>
        <p>Peso total {totalQuantity}kg</p>
        <p>Distância 2km</p>
      </div>
      {!!user?.transporter_id && (
        <div className="flex-2 ml-4">
          <button className="bg-green-700 text-white rounded-xl p-2 border border-slate-200 hover:bg-green-500 active:bg-green-700 duration-100">
            Aceitar entrega
          </button>
        </div>
      )}
      {!!user?.transporter_id && (
        <div className="flex-2 ml-4">
          <button className="bg-green-700 text-white rounded-xl p-2 border border-slate-200 hover:bg-green-500 active:bg-green-700 duration-100">
            Aceitar entrega
          </button>
        </div>
      )}
      {deliveryStatus === "FINISHED" && (
        <div className="flex flex-col items-center ml-4">
          <FontAwesomeIcon icon={faCircleCheck} size="3x" color="green" />
          {transporter && (
            <div className="font-medium mt-2 text-center">
              <p>
                {parseStatus(deliveryStatus)} por {transporter.name}
              </p>
            </div>
          )}
        </div>
      )}
      {deliveryStatus === "INCOMING" && (
        <div className="flex flex-col items-center ml-4">
          <FontAwesomeIcon icon={faCarSide} size="3x" color="orange" />
          {transporter && (
            <div className="font-medium mt-2 text-center">
              <p>
                {parseStatus(deliveryStatus)} por {transporter.name}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DonationCard;
